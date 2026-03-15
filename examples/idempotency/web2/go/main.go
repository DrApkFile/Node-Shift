package main

import (
	"net/http"
	"sync"
	"github.com/gin-gonic/gin"
)

var (
	cache = make(map[string]interface{})
	mutex sync.RWMutex
)

func main() {
	r := gin.Default()

	r.POST("/api/transactions", func(c *gin.Context) {
		key := c.GetHeader("Idempotency-Key")
		if key == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Idempotency-Key required"})
			return
		}

		mutex.RLock()
		if val, exists := cache[key]; exists {
			mutex.RUnlock()
			c.JSON(http.StatusOK, val)
			return
		}
		mutex.RUnlock()

		// Real Logic
		response := gin.H{"tx_id": "tx_abc", "status": "confirmed"}

		mutex.Lock()
		cache[key] = response
		mutex.Unlock()

		c.JSON(http.StatusCreated, response)
	})

	r.Run(":8084")
}
