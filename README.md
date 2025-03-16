# 3D Cube Game Backend

This project is a backend service for the 3D Cube Game. It stores player scores along with player names and game timestamps, and it provides a RESTful API built with TypeScript and Express for managing scores.

## Features

-   **Score Storage:** Persist player scores with names and timestamps.
-   **Leaderboard Support:** Retrieve and sort scores for building a leaderboard.
-   **RESTful API:** Endpoints for submitting and retrieving scores.
-   **MongoDB Integration:** Uses Mongoose for simple data modeling.

## Project Structure
3d-cube-game-backend
├── src
│   ├── controllers         
│   ├── models             
│   ├── routes              
│   ├── services           
│   └── app.ts              
├── package.json           
├── tsconfig.json          
└── README.md             

## Installation & Setup

1.  **Clone the Repository**

    ```sh
    git clone <repository-url>
    cd 3d-cube-game-backend
    ```

2.  **Install Dependencies**

    ```sh
    npm install
    ```

3.  **Configure Environment Variables**

    Create a `.env` file in the project root with the following content (adjust as needed):

    ```
    MONGODB_URI=mongodb://localhost:27017/cube_game
    PORT=3000
    ```

4.  **Compile TypeScript**

    ```sh
    npm run build
    ```

5.  **Start the Server**

    ```sh
    npm start
    ```

## API Endpoints

### `POST /api/scores`

**Description:** Submit a new score.

**Request Body:**

```json
{
  "name": "Player Name",
  "score": 100,
  "date": "2023-10-01T12:00:00Z"
} 
```

Notes: This endpoint accepts a JSON payload to create a new score record.

**GET /api/scores**
Description: Retrieve all scores sorted in descending order by score.

Response JSON:
```json
[
  {
    "name": "Player Name",
    "score": 100,
    "date": "2023-10-01T12:00:00Z"
  }
]
```
**Development Setup**
VS Code Configuration: Launch configurations are available in launch.json and project tasks are defined in tasks.json for compiling TypeScript using tsconfig.json.

**Testing**: Basic unit tests can be added to ensure API endpoints and business logic work as expected. Consider using a framework like Jest.

**Additional Notes**
Data Model: The score data model is defined in the models folder using Mongoose, mapping to the corresponding collection in MongoDB.

**Business Logic**: Core logic for handling score creation and fetching is contained in the services layer to keep controllers clean and focused.

**Error Handling**: Global error handling middleware is implemented in app.ts for consistent API error responses.
