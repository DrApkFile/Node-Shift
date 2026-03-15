package main

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

var userRoles = map[string]string{
	"admin_user": "ADMIN",
	"standard_user": "USER",
}

func AuthMiddleware(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.GetHeader("User")
		role, ok := userRoles[user]
		if !ok || role != requiredRole {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		c.Next()
	}
}

func main() {
	r := gin.Default()

	r.GET("/admin", AuthMiddleware("ADMIN"), func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Welcome Admin"})
	})

	r.Run(":8091")
}
