package main

import (
	"net/http"
	"strconv"
	"sync"
	"github.com/gin-gonic/gin"
)

type Job struct {
	ID     int     `json:"id"`
	Task   string  `json:"task"`
	Status string  `json:"status"`
	Bounty float64 `json:"bounty"`
	Worker string  `json:"worker,omitempty"`
}

var (
	jobsDB = make(map[int]*Job)
	counter int
	muJobs  sync.Mutex
)

func main() {
	r := gin.Default()

	r.POST("/api/jobs", func(c *gin.Context) {
		var j struct { Task string; Bounty float64 }
		c.ShouldBindJSON(&j)
		
		muJobs.Lock()
		counter++
		job := &Job{ID: counter, Task: j.Task, Status: "PENDING", Bounty: j.Bounty}
		jobsDB[counter] = job
		muJobs.Unlock()
		
		c.JSON(http.StatusCreated, job)
	})

	r.POST("/api/jobs/:id/claim", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var req struct { Worker string }
		c.ShouldBindJSON(&req)

		muJobs.Lock()
		job, ok := jobsDB[id]
		if !ok || job.Status != "PENDING" {
			muJobs.Unlock()
			c.JSON(http.StatusBadRequest, gin.H{"error": "job not available"})
			return
		}
		job.Status = "CLAIMED"
		job.Worker = req.Worker
		muJobs.Unlock()

		c.JSON(http.StatusOK, job)
	})

	r.Run(":8089")
}
