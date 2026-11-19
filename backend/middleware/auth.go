package middleware

import (
	"net/http"
	"strings"

	"farmasi/backend/config"
	"farmasi/backend/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.SendError(c, http.StatusUnauthorized, "Authorization token is required", nil)
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.SendError(c, http.StatusUnauthorized, "Invalid token format (Bearer <token>)", nil)
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(parts[1], cfg.JWTSecret)
		if err != nil {
			utils.SendError(c, http.StatusUnauthorized, "Token is expired or invalid", err.Error())
			c.Abort()
			return
		}

		// Inject into gin context
		c.Set("user_id", claims.UserID)
		c.Set("company_id", claims.CompanyID)
		c.Set("branch_id", claims.BranchID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)
		c.Set("roles", claims.Roles)

		c.Next()
	}
}

func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRolesVal, exists := c.Get("roles")
		if !exists {
			utils.SendError(c, http.StatusForbidden, "Akses ditolak: peran tidak ditemukan", nil)
			c.Abort()
			return
		}

		userRoles, ok := userRolesVal.([]string)
		if !ok {
			utils.SendError(c, http.StatusForbidden, "Akses ditolak: format peran salah", nil)
			c.Abort()
			return
		}

		for _, ur := range userRoles {
			if ur == "SuperAdmin" {
				c.Next()
				return
			}
			for _, ar := range allowedRoles {
				if ur == ar {
					c.Next()
					return
				}
			}
		}

		utils.SendError(c, http.StatusForbidden, "Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini", nil)
		c.Abort()
	}
}
