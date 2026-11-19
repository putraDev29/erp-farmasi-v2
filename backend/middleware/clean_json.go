package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CleanJSONMiddleware removes empty string UUIDs ("id": "", "category_id": "")
// so GORM and Gin JSON unmarshaling won't fail with "invalid UUID length: 0".
func CleanJSONMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method != http.MethodPost && c.Request.Method != http.MethodPut && c.Request.Method != http.MethodPatch {
			c.Next()
			return
		}
		if !strings.Contains(c.GetHeader("Content-Type"), "application/json") {
			c.Next()
			return
		}

		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil || len(bodyBytes) == 0 {
			c.Next()
			return
		}

		var data interface{}
		if err := json.Unmarshal(bodyBytes, &data); err == nil {
			cleanEmptyUUIDs(data, c.Request.Method)
			cleanedBytes, err := json.Marshal(data)
			if err == nil {
				c.Request.Body = io.NopCloser(bytes.NewBuffer(cleanedBytes))
			} else {
				c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			}
		} else {
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		c.Next()
	}
}

func cleanEmptyUUIDs(v interface{}, method string) {
	switch val := v.(type) {
	case map[string]interface{}:
		for k, item := range val {
			if k == "youtube_video_id" {
				continue
			}
			if str, ok := item.(string); ok {
				trimmed := strings.TrimSpace(str)
				if trimmed == "" {
					if k == "id" || k == "ID" {
						delete(val, k)
					} else if strings.HasSuffix(k, "_id") || strings.HasSuffix(k, "_ID") || strings.HasSuffix(k, "Id") {
						val[k] = nil
					}
				}
			} else {
				cleanEmptyUUIDs(item, method)
			}
		}
	case []interface{}:
		for _, item := range val {
			cleanEmptyUUIDs(item, method)
		}
	}
}
