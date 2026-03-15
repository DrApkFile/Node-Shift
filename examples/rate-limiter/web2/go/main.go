package main

import (
	"net/http"
	"sync"
	"time"
	"github.com/gin-gonic/gin"
)

type RateRecord struct {
	Count      int
	WindowStart time.Time
}

var (
	limitStore = make(map[string]*RateRecord)
	muLimit    sync.Mutex
)

const (
	MaxRequests = 5
	WindowSize  = 1 * time.Minute
)

func main() {
	r := gin.Default()

	r.GET("/api/resource", func(c *gin.Context) {
		ip := c.ClientIP()
		muLimit.Lock()
		defer muLimit.Unlock()

		now := time.Now()
		record, exists := limitStore[ip]

		if !exists || now.Sub(record.WindowStart) > WindowSize {
			limitStore[ip] = &RateRecord{Count: 1, WindowStart: now}
			c.JSON(http.StatusOK, gin.H{"message": "Success"})
			return
		}

		if record.Count >= MaxRequests {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
				"retry_after": int(WindowSize.Seconds() - now.Sub(record.WindowStart).Seconds()),
			})
			return
		}

		record.Count++
		c.JSON(http.StatusOK, gin.H{"message": "Success", "remaining": MaxRequests - record.Count})
	})

	r.Run(":8086")
}
