package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// KeyMetadata stores information about an API key
type KeyMetadata struct {
	UserID     string    `json:"user_id"`
	Plan       string    `json:"plan"`
	CreatedAt  time.Time `json:"created_at"`
	IsActive   bool      `json:"is_active"`
	UsageCount int       `json:"usage_count"`
}

// In-memory database with thread safety
var (
	apiKeysDb = make(map[string]*KeyMetadata)
	dbMutex   sync.RWMutex
)

func hashKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

func generateKey() string {
	return fmt.Sprintf("sk_test_%s", uuid.New().String())
}

func main() {
	r := gin.Default()

	// 1. Create API Key
	r.POST("/api/keys", func(c *gin.Context) {
		var req struct {
			UserID string `json:"user_id" binding:"required"`
			Plan   string `json:"plan"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if req.Plan == "" {
			req.Plan = "basic"
		}

		rawKey := generateKey()
		hashedKey := hashKey(rawKey)

		dbMutex.Lock()
		apiKeysDb[hashedKey] = &KeyMetadata{
			UserID:    req.UserID,
			Plan:      req.Plan,
			CreatedAt: time.Now(),
			IsActive:  true,
		}
		dbMutex.Unlock()

		c.JSON(http.StatusCreated, gin.H{
			"message": "Key created. Store it securely.",
			"api_key": rawKey,
		})
	})

	// 2. Protected Route Middleware
	apiKeyAuth := func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Missing token"})
			return
		}

		token := authHeader[7:]
		hashedToken := hashKey(token)

		dbMutex.Lock()
		meta, exists := apiKeysDb[hashedToken]
		if !exists || !meta.IsActive {
			dbMutex.Unlock()
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid key"})
			return
		}
		meta.UsageCount++
		dbMutex.Unlock()

		// Set user context
		c.Set("user_id", meta.UserID)
		c.Set("plan", meta.Plan)
		c.Next()
	}

	// 3. Protected Resource
	r.GET("/api/protected-data", apiKeyAuth, func(c *gin.Context) {
		userID := c.GetString("user_id")
		plan := c.GetString("plan")

		c.JSON(http.StatusOK, gin.H{
			"message": "Access granted to Go backend!",
			"user_id": userID,
			"plan":    plan,
			"data":    "Secret internal info",
		})
	})

	log.Println("Go API Key Server starting on :8080")
	r.Run(":8080")
}
