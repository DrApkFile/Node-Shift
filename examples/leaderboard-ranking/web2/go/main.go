package main

import (
	"net/http"
	"sort"
	"sync"
	"github.com/gin-gonic/gin"
)

type Entry struct {
	Username string `json:"username"`
	Score    int    `json:"score"`
}

var (
	scoresDB = make(map[string]int)
	muBoard  sync.RWMutex
)

func main() {
	r := gin.Default()

	r.POST("/api/scores", func(c *gin.Context) {
		var e Entry
		c.ShouldBindJSON(&e)
		
		muBoard.Lock()
		if e.Score > scoresDB[e.Username] {
			scoresDB[e.Username] = e.Score
		}
		muBoard.Unlock()
		c.JSON(http.StatusOK, gin.H{"status": "captured"})
	})

	r.GET("/api/leaderboard", func(c *gin.Context) {
		muBoard.RLock()
		var board []Entry
		for u, s := range scoresDB {
			board = append(board, Entry{Username: u, Score: s})
		}
		muBoard.RUnlock()

		sort.Slice(board, func(i, j int) bool {
			return board[i].Score > board[j].Score
		})

		if len(board) > 10 {
			board = board[:10]
		}
		c.JSON(http.StatusOK, board)
	})

	r.Run(":8087")
}
