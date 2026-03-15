package main

import (
	"net/http"
	"sync"
	"time"
	"github.com/gin-gonic/gin"
)

type LeaderState struct {
	ID     string    `json:"id"`
	Expiry time.Time `json:"expiry"`
}

var (
	stateLeader = &LeaderState{}
	muLeader    sync.Mutex
)

func main() {
	r := gin.Default()

	r.POST("/api/leader/claim", func(c *gin.Context) {
		var req struct{ ID string `json:"id"` }
		c.ShouldBindJSON(&req)

		muLeader.Lock()
		defer muLeader.Unlock()

		now := time.Now()
		if stateLeader.ID == "" || now.After(stateLeader.Expiry) {
			stateLeader.ID = req.ID
			stateLeader.Expiry = now.Add(15 * time.Second)
			c.JSON(http.StatusOK, gin.H{"status": "ELECTED", "id": req.ID})
			return
		}

		if stateLeader.ID == req.ID {
			stateLeader.Expiry = now.Add(15 * time.Second)
			c.JSON(http.StatusOK, gin.H{"status": "RENEWED"})
			return
		}

		c.JSON(http.StatusConflict, gin.H{"status": "FAILED", "current": stateLeader.ID})
	})

	r.Run(":8085")
}
