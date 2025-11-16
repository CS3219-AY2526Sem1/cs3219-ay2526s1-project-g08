# CS3219 Project (PeerPrep) - AY2526S1
## Group: G08

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stackk)
4. [Installation](#installation)
5. [Running Locally](#running-locally)
6. [Environment Variables](#environment-variables)
7. [Deployment](#deployment)
8. [AI Usage](#ai-use-summary)

## Overview

PeerPrep is a microservices-based web application designed to help students prepare for technical interviews through real-time peer matching, code collaboration, and topic-tagged question practice.

This project was done by Group 08 - Xu Ziqi, Zhu Yicheng, Tan Zhi Heng, Swaminathan Viswa, Subramanian Karthikeyan

### Core Features/Services: 

User-Service (M1): The User Service provides user authentication and user-profile management. Users can register using their Github (as most developers would have), manage their profiles, and track their question attempt history. The service includes role-based access control with admin privileges for user management.

Matching-Service (M2): The Matching Service implements a queue-based algorithm that pairs users based on selected difficulty level, coding language and topic. The system attempts and doing an exact-match for user based on chosen fators and also gives the option of accepting/declining a match based on the user they have been paried with. Users who have been declined on will be auto-added to the queue back and matched again, if other potential users present. 

Question-Service (M3): The Question Service provides a comprehensive database of technical interview questions organised by difficulty level (Easy, Medium, Hard) and topics (Array, String, Graph, etc.). Users can browse questions, filter by preferences, and access detailed problem descriptions with example test cases.

Collaboration-Service (M4): The Collaboration Service enables real-time code editing with automatic synchronisation across clients using WebSocket connections. 

User Interface: The frontend provides an intuitive React-based interface with Monaco Editor for code editing, question display, and user dashboard.

### Nice-to-have Features



## Architecture

## Tech-Stack 

### FRONTEND
- React + TypeScript
- MUI Component Library 
- Vite (bundler)

### BACKEND
- Node.js + Express (Core Framework)
- MongoDB (primary database)
- Redis (matchmaking queue handler)
- Yjs (CRDT for collaborative editing)

### DEV-OPS & DEPLOYMENT 
- Docker (service containerization)
- AWS ECS (Elastic Container Service) — microservice orchestration
- AWS ECR (container registry)
- AWS CloudFront (serves frontend globally)
- AWS S3 (static hosting for frontend)
- AWS CloudWatch (logs, metrics, dashboards)
- AWS Secrets Manager — credential storage
- GitHub Actions (CI/CD pipeline)

## Installation

Install React: `npm run install`

## Running Locally 

1. Initialise Docker containers: `docker compose up --build`
2. Change directory to web-server: `cd web-server`
3. Run front-end of web server: `npm run start`
3. Bring down containers: `docker compose down`

## Environment Configuration 

## AI Use Summary 

