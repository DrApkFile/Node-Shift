package main

import (
	"net/http"
	"sync"
	"time"
	"github.com/gin-gonic/gin"
)

type Subscription struct {
	UserID string    `json:"userId"`
	Expiry time.Time `json:"expiry"`
}

var (
	subsDB = make(map[string]time.Time)
	muSubs sync.RWMutex
)

func main() {
	r := gin.Default()

	r.POST("/api/subscribe", func(c *gin.Context) {
		var req struct {
			UserID string `json:"userId"`
			Weeks  int    `json:"weeks"`
		}
		c.ShouldBindJSON(&req)

		muSubs.Lock()
		expiry := time.Now().AddDate(0, 0, req.Weeks*7)
		subsDB[req.UserID] = expiry
		muSubs.Unlock()

		c.JSON(http.StatusOK, gin.H{"status": "Active", "expiry": expiry})
	})

	r.GET("/api/status/:userId", func(c *gin.Context) {
		uid := c.Param("userId")
		muSubs.RLock()
		expiry, ok := subsDB[uid]
		muSubs.RUnlock()

		if !ok {
			c.JSON(http.StatusOK, gin.H{"status": "Inactive"})
			return
		}

		if time.Now().After(expiry) {
			c.JSON(http.StatusOK, gin.H{"status": "Expired", "expiry": expiry})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "Active", "expiry": expiry})
	})

	r.Run(":8090")
}
