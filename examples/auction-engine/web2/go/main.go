package main

import (
	"net/http"
	"sync"
	"github.com/gin-gonic/gin"
)

type Auction struct {
	ItemID        string  `json:"item_id"`
	Seller        string  `json:"seller"`
	HighestBid    float64 `json:"highest_bid"`
	HighestBidder string  `json:"highest_bidder"`
	Active        bool    `json:"active"`
}

var (
	auctions = make(map[string]*Auction)
	mutex    sync.RWMutex
)

func main() {
	r := gin.Default()

	r.POST("/api/auctions", func(c *gin.Context) {
		var a Auction
		if err := c.ShouldBindJSON(&a); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		a.Active = true
		mutex.Lock()
		auctions[a.ItemID] = &a
		mutex.Unlock()
		c.JSON(http.StatusCreated, a)
	})

	r.POST("/api/auctions/:id/bid", func(c *gin.Context) {
		id := c.Param("id")
		var req struct {
			Bidder string  `json:"bidder"`
			Amount float64 `json:"amount"`
		}
		c.ShouldBindJSON(&req)

		mutex.Lock()
		defer mutex.Unlock()
		a, exists := auctions[id]
		if !exists || !a.Active {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if req.Amount <= a.HighestBid {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bid too low"})
			return
		}
		a.HighestBid = req.Amount
		a.HighestBidder = req.Bidder
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	r.Run(":8081")
}
