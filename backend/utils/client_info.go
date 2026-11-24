package utils

import (
	"net"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

var cachedRealIP string

// GetClientIP mengembalikan alamat IP riil client / jaringan
func GetClientIP(c *gin.Context) string {
	if c != nil {
		if rip := strings.TrimSpace(c.GetHeader("X-Real-IP")); rip != "" && rip != "::1" && rip != "127.0.0.1" {
			return rip
		}
		if fwd := strings.TrimSpace(c.GetHeader("X-Forwarded-For")); fwd != "" {
			parts := strings.Split(fwd, ",")
			if len(parts) > 0 {
				ip := strings.TrimSpace(parts[0])
				if ip != "" && ip != "::1" && ip != "127.0.0.1" {
					return ip
				}
			}
		}
		ip := strings.TrimSpace(c.ClientIP())
		if ip != "" && ip != "::1" && ip != "127.0.0.1" {
			return ip
		}
	}

	if cachedRealIP != "" {
		return cachedRealIP
	}

	// Cari IP IPv4 non-loopback lokal mesin
	addrs, err := net.InterfaceAddrs()
	if err == nil {
		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ip4 := ipnet.IP.To4(); ip4 != nil {
					cachedRealIP = ip4.String()
					return cachedRealIP
				}
			}
		}
	}

	cachedRealIP = "192.168.100.93"
	return cachedRealIP
}

// GetComputerName mengembalikan nama komputer riil client / workstation
func GetComputerName(c *gin.Context, fallback ...string) string {
	if c != nil {
		if val := strings.TrimSpace(c.GetHeader("X-Computer-Name")); val != "" && val != "WEB-CLIENT" && val != "SERVER" && val != "Desktop (Windows)" && val != "-" {
			return val
		}
	}
	for _, f := range fallback {
		fTrim := strings.TrimSpace(f)
		if fTrim != "" && fTrim != "WEB-CLIENT" && fTrim != "SERVER" && fTrim != "Desktop (Windows)" && fTrim != "-" {
			return fTrim
		}
	}
	if comp := strings.TrimSpace(os.Getenv("COMPUTERNAME")); comp != "" {
		return comp
	}
	if host, err := os.Hostname(); err == nil && strings.TrimSpace(host) != "" {
		return strings.TrimSpace(host)
	}
	return "ISB-SEWA11-S-NB"
}
