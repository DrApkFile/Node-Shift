package main

import (
	"fmt"
	"net/http"
	"sync"
	"github.com/gin-gonic/gin"
)

type Escrow struct {
	Buyer  string  `json:"buyer"`
	Seller string  `json:"seller"`
	Amount float64 `json:"amount"`
	Status string  `json:"status"` // PENDING, RELEASED, REFUNDED
}

var (
	escrows = make(map[string]*Escrow)
	mutex   sync.RWMutex
)

func main() {
	r := gin.Default()

	r.POST("/api/escrow/init", func(c *gin.Context) {
		var req struct {
			ID     string  `json:"id"`
			Buyer  string  `json:"buyer"`
			Seller string  `json:"seller"`
			Amount float64 `json:"amount"`
		}
		c.ShouldBindJSON(&req)

		mutex.Lock()
		escrows[req.ID] = &Escrow{Buyer: req.Buyer, Seller: req.Seller, Amount: req.Amount, Status: "PENDING"}
		mutex.Unlock()
		c.JSON(201, gin.H{"status": "initiated"})
	})

	r.POST("/api/escrow/:id/release", func(c *gin.Context) {
		id := c.Param("id")
		var req struct{ Actor string `json:"actor"` }
		c.ShouldBindJSON(&req)

		mutex.Lock()
		defer mutex.Unlock()
		e, exists := escrows[id]
		if !exists || e.Status != "PENDING" {
			c.JSON(400, gin.H{"error": "invalid escrow"})
			return
		}
		if req.Actor != e.Buyer {
			c.JSON(403, gin.H{"error": "unauthorized"})
			return
		}
		e.Status = "RELEASED"
		c.JSON(200, gin.H{"msg": fmt.Sprintf("funds sent to %s", e.Seller)})
	})

	r.Run(":8083")
}
