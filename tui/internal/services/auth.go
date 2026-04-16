package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type AuthSession struct {
	Username     string
	AccessToken  string
	RefreshToken string
	UserID       int
}

type AuthClient interface {
	Login(username string, password string) (AuthSession, error)
	Register(username string, password string) (AuthSession, error)
	ValidateAccessToken(token string, refreshToken string, userID int) (string, error)
}

type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("api error (%d): %s", e.Status, e.Message)
}

type HTTPAuthClient struct {
	baseURL string
	client  *http.Client
}

type authSuccessResponse struct {
	Success      bool   `json:"success"`
	Message      string `json:"message"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	Data         struct {
		AccessToken  string `json:"accessToken"`
		RefreshToken string `json:"refreshToken"`
	} `json:"data"`
}

type authErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type authPayload struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type jwtValidationPayload struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refreshToken"`
	UserID       int    `json:"userId"`
}

func NewHTTPAuthClient() *HTTPAuthClient {
	baseURL := os.Getenv("TUI_API_BASE_URL")
	if strings.TrimSpace(baseURL) == "" {
		baseURL = "http://localhost:8080"
	}

	return &HTTPAuthClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func NewHTTPAuthClientWith(baseURL string, client *http.Client) *HTTPAuthClient {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}

	return &HTTPAuthClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  client,
	}
}

func (c *HTTPAuthClient) Login(username string, password string) (AuthSession, error) {
	response, err := c.postJSON("/api/auth/login", authPayload{
		Username: username,
		Password: password,
	})
	if err != nil {
		return AuthSession{}, err
	}

	return decodeAuthSession(username, response)
}

func (c *HTTPAuthClient) Register(username string, password string) (AuthSession, error) {
	response, err := c.postJSON("/api/auth/register", authPayload{
		Username: username,
		Password: password,
	})
	if err != nil {
		return AuthSession{}, err
	}

	return decodeAuthSession(username, response)
}

func (c *HTTPAuthClient) ValidateAccessToken(token string, refreshToken string, userID int) (string, error) {
	response, err := c.postJSON("/api/auth/jwt", jwtValidationPayload{
		Token:        token,
		RefreshToken: refreshToken,
		UserID:       userID,
	})
	if err != nil {
		return "", err
	}

	accessToken := response.Data.AccessToken
	if accessToken == "" {
		accessToken = response.AccessToken
	}
	if accessToken == "" {
		return "", fmt.Errorf("auth jwt response missing accessToken")
	}

	return accessToken, nil
}

func (c *HTTPAuthClient) postJSON(path string, payload any) (authSuccessResponse, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return authSuccessResponse{}, err
	}

	req, err := http.NewRequest(http.MethodPost, c.baseURL+path, bytes.NewBuffer(body))
	if err != nil {
		return authSuccessResponse{}, err
	}

	req.Header.Set("Content-Type", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return authSuccessResponse{}, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return authSuccessResponse{}, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var parsedError authErrorResponse
		_ = json.Unmarshal(raw, &parsedError)

		message := parsedError.Error
		if strings.TrimSpace(message) == "" {
			message = strings.TrimSpace(string(raw))
		}
		if strings.TrimSpace(message) == "" {
			message = "request failed"
		}

		return authSuccessResponse{}, &APIError{
			Status:  resp.StatusCode,
			Message: message,
		}
	}

	var parsedSuccess authSuccessResponse
	if err := json.Unmarshal(raw, &parsedSuccess); err != nil {
		return authSuccessResponse{}, err
	}
	if !parsedSuccess.Success {
		return authSuccessResponse{}, fmt.Errorf("expected success response but got success=false")
	}

	return parsedSuccess, nil
}

func decodeAuthSession(username string, response authSuccessResponse) (AuthSession, error) {
	accessToken := response.Data.AccessToken
	refreshToken := response.Data.RefreshToken

	if accessToken == "" {
		accessToken = response.AccessToken
	}
	if refreshToken == "" {
		refreshToken = response.RefreshToken
	}
	if accessToken == "" || refreshToken == "" {
		return AuthSession{}, fmt.Errorf("auth response missing required tokens")
	}

	userID, err := decodeUserIDFromToken(accessToken)
	if err != nil {
		return AuthSession{}, err
	}

	return AuthSession{
		Username:     username,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       userID,
	}, nil
}

func decodeUserIDFromToken(token string) (int, error) {
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return 0, fmt.Errorf("invalid token format")
	}

	payloadRaw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid token payload encoding: %w", err)
	}

	var payload struct {
		UserID int `json:"userId"`
	}
	if err := json.Unmarshal(payloadRaw, &payload); err != nil {
		return 0, fmt.Errorf("invalid token payload json: %w", err)
	}
	if payload.UserID == 0 {
		return 0, fmt.Errorf("token payload missing userId")
	}

	return payload.UserID, nil
}

