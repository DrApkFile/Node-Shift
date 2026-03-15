package main

import (
	"net/http"
	"sort"
	"sync"
	"github.com/gin-gonic/gin"
)

type Order struct {
	Trader   string  `json:"trader"`
	Side     string  `json:"side"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

type OrderBook struct {
	Bids []Order `json:"bids"`
	Asks []Order `json:"asks"`
}

var (
	book  = &OrderBook{Bids: []Order{}, Asks: []Order{}}
	muBook sync.Mutex
)

func main() {
	r := gin.Default()

	r.POST("/api/orders", func(c *gin.Context) {
		var o Order
		c.ShouldBindJSON(&o)
		
		muBook.Lock()
		defer muBook.Unlock()

		if o.Side == "BUY" {
			o.Quantity = match(o, &book.Asks, true)
			if o.Quantity > 0 {
				book.Bids = append(book.Bids, o)
				sort.Slice(book.Bids, func(i, j int) bool { return book.Bids[i].Price > book.Bids[j].Price })
			}
		} else {
			o.Quantity = match(o, &book.Bids, false)
			if o.Quantity > 0 {
				book.Asks = append(book.Asks, o)
				sort.Slice(book.Asks, func(i, j int) bool { return book.Asks[i].Price < book.Asks[j].Price })
			}
		}

		c.JSON(http.StatusOK, book)
	})

	r.Run(":8088")
}

func match(o Order, opposites *[]Order, isBuy bool) int {
	rem := o.Quantity
	for len(*opposites) > 0 && rem > 0 {
		best := &(*opposites)[0]
		match := (isBuy && o.Price >= best.Price) || (!isBuy && o.Price <= best.Price)
		if !match { break }
		
		qty := min(rem, best.Quantity)
		rem -= qty
		best.Quantity -= qty
		if best.Quantity == 0 {
			*opposites = (*opposites)[1:]
		}
	}
	return rem
}

func min(a, b int) int { if a < b { return a }; return b }
