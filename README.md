# Hello World — Travel & Country Discovery Platform

[View Live Website](https://proj.ruppin.ac.il/cgroup26/test2/tar2/Pages/index.html)

Hosted on Ruppin Academic Center's server.

Hello World is a web platform for travelers to share their travel experiences, discover countries, and test their knowledge of the world. Users can post travel stories, rate countries, and play country-related games.

The application combines a frontend built with HTML, CSS, and JavaScript with a C# backend organized using a three-tier architecture.

## Features

- **Travel stories:** Share experiences from trips around the world.
- **Country ratings:** Rate countries based on travel experiences.
- **Country trivia:** Test your knowledge of countries around the world.
- **Memory game:** Play a country-themed memory matching game.
- **Real-time chat:** Chat with other users through Firebase.
- **AI-generated country facts:** Selecting a country sends a request to the Gemini API to generate an interesting fact about it.
- **Country information:** Access country data sourced from the Countries.dev API.

## Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | C#, ASP.NET Web API |
| Architecture | Three-tier architecture |
| Database | Microsoft SQL Server |
| Database management | SQL Server Management Studio (SSMS) |
| External API | Countries.dev |
| Additional integrations | Gemini API, Firebase |

## Backend Architecture

The backend separates responsibilities into three tiers:

- **Presentation / API layer:** Receives HTTP requests and returns responses.
- **Business logic layer:** Handles application rules and processing.
- **Data access layer:** Handles communication with the database.

## Repository Structure

- `frontend/` — Client-side pages, styles, JavaScript, and assets.
- `backend/` — C# backend solution, application code, and configuration.

## Data Source & Integrations

- **Countries.dev:** Supplies country data.
- **Gemini API:** Generates an interesting fact about a country when the user selects it.
- **Firebase:** Supports real-time chat between users.

## Local Setup

Detailed setup instructions, including database initialization and service configuration, will be added to this README.

Do not commit database passwords, private keys, or API secrets. Provide your own local configuration when running the application.

## Team

Developed collaboratively by **Roei, Or, and Gefen** as a student team project. Team members shared responsibility for frontend and backend development, dividing work by pages and features.
