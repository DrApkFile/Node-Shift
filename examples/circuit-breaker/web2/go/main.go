package main

import (
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type State string

const (
	Closed   State = "CLOSED"
	Open     State = "OPEN"
	HalfOpen State = "HALF_OPEN"
)

type CircuitBreaker struct {
	State           State
	FailureCount    int
	LastFailureTime time.Time
	Mutex           sync.RWMutex
}

var (
	breaker = &CircuitBreaker{State: Closed}
	threshold = 3
	timeout   = 10 * time.Second
)

func main() {
	r := gin.Default()

	r.GET("/api/call", func(c *gin.Context) {
		breaker.Mutex.Lock()
		defer breaker.Mutex.Unlock()

		now := time.Now()

		// Transition Open -> HalfOpen
		if breaker.State == Open && now.Sub(breaker.LastFailureTime) > timeout {
			breaker.State = HalfOpen
		}

		// Block if Open
		if breaker.State == Open {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Circuit is OPEN"})
			return
		}

		// Simulate Remote Call
		if rand.Float32() > 0.5 { // Success
			breaker.State = Closed
			breaker.FailureCount = 0
			c.JSON(http.StatusOK, gin.H{"status": "success"})
		} else { // Failure
			breaker.FailureCount++
			breaker.LastFailureTime = now
			if breaker.State == HalfOpen || breaker.FailureCount >= threshold {
				breaker.State = Open
			}
			c.JSON(http.StatusInternalServerError, gin.H{"status": "fail", "state": breaker.State})
		}
	})

	r.Run(":8082")
}
