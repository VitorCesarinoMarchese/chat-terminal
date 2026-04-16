package services_test

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	internalservices "github.com/VitorCesarinoMarchese/chat-terminal/internal/services"
)

func tokenWithUserID(userID int) string {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"userId":%d}`, userID)))
	return fmt.Sprintf("%s.%s.signature", header, payload)
}

func TestLoginSuccessParsesStandardizedContract(t *testing.T) {
	token := tokenWithUserID(33)
	refresh := "refresh-token"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/auth/login" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(
			w,
			`{"success":true,"message":"ok","data":{"accessToken":"%s","refreshToken":"%s"}}`,
			token,
			refresh,
		)
	}))
	defer server.Close()

	client := internalservices.NewHTTPAuthClientWith(server.URL, server.Client())
	session, err := client.Login("alice", "password")
	if err != nil {
		t.Fatalf("expected login success, got error: %v", err)
	}

	if session.Username != "alice" {
		t.Fatalf("expected username alice, got %q", session.Username)
	}
	if session.AccessToken != token || session.RefreshToken != refresh {
		t.Fatalf("unexpected token payload: %#v", session)
	}
	if session.UserID != 33 {
		t.Fatalf("expected decoded user id 33, got %d", session.UserID)
	}
}

func TestRegisterSuccessSupportsTopLevelTokenFallback(t *testing.T) {
	token := tokenWithUserID(10)
	refresh := "top-level-refresh"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/auth/register" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(
			w,
			`{"success":true,"message":"created","accessToken":"%s","refreshToken":"%s"}`,
			token,
			refresh,
		)
	}))
	defer server.Close()

	client := internalservices.NewHTTPAuthClientWith(server.URL, server.Client())
	session, err := client.Register("new-user", "password")
	if err != nil {
		t.Fatalf("expected register success, got error: %v", err)
	}

	if session.AccessToken != token || session.RefreshToken != refresh {
		t.Fatalf("unexpected register token response: %#v", session)
	}
	if session.UserID != 10 {
		t.Fatalf("expected decoded user id 10, got %d", session.UserID)
	}
}

func TestLoginReturnsAPIErrorContract(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"success":false,"error":"Invalid credentials"}`))
	}))
	defer server.Close()

	client := internalservices.NewHTTPAuthClientWith(server.URL, server.Client())
	_, err := client.Login("bad-user", "bad-password")
	if err == nil {
		t.Fatalf("expected login error for unauthorized response")
	}
}

func TestValidateAccessTokenReturnsRefreshedAccessToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/auth/jwt" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"message":"refreshed","data":{"accessToken":"new-access"}}`))
	}))
	defer server.Close()

	client := internalservices.NewHTTPAuthClientWith(server.URL, server.Client())
	token, err := client.ValidateAccessToken("old", "refresh", 1)
	if err != nil {
		t.Fatalf("expected validate token success, got error: %v", err)
	}
	if token != "new-access" {
		t.Fatalf("expected refreshed token new-access, got %q", token)
	}
}

func TestLoginFailsOnMalformedTokenEdgeCase(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"success":true,"message":"ok","data":{"accessToken":"not-a-jwt","refreshToken":"r"}}`))
	}))
	defer server.Close()

	client := internalservices.NewHTTPAuthClientWith(server.URL, server.Client())
	if _, err := client.Login("user", "password"); err == nil {
		t.Fatalf("expected malformed token edge case to return error")
	}
}

