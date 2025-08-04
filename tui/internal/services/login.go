package services

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"net/http"
)

type PostLogin struct {
	user     string `json:"user"`
	password string `json:"password"`
}

func Login() string {
	data := PostLogin{
		user:     "",
		password: "",
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		panic(err)
	}

	req, err := http.NewRequest("POST", "localhost:3000/login", bytes.NewBuffer(jsonData))
	if err != nil {
		panic(err)
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}

	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	return string(body)

}
