const express = require('express')
const mongoose = require('mongoose')
const app = express()
const cors = require('cors')
require('dotenv').config()

const User = require('./models/user')
const Exercise = require('./models/exercise')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
})

app.use(cors())

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app
  .route('/api/users')
  .get((req, res) => {
    User.find({}, (error, data) => {
      //console.log(data);
      res.json(data)
    })
  })
  .post((req, res) => {
    // Get username input into form
    const potentialUsername = req.body.username

    // Check to see if the username has already been entered
    User.findOne({ username: potentialUsername }, (error, data) => {
      if (error) {
        res.send('Unknown userID')
        return console.log(error)
      }

      if (!data) {
        // If username is not stored yet, create and save a User object
        const newUser = new User({
          username: potentialUsername,
        })

        // Save the user
        newUser.save((error, data) => {
          if (error) return console.log(error)
          // Remove the key-value pair associated with the key __v
          const reducedData = {
            username: data.username,
            _id: data._id,
          }
          res.json(reducedData)
        })
      } else {
        res.send(`Username ${potentialUsername} already exists.`)
      }
    })
  })

app.post('/api/users/:_id/exercises', (req, res) => {
  const userID = req.body[':_id'] || req.params._id
  const descriptionEntered = req.body.description
  const durationEntered = req.body.duration
  const dateEntered = req.body.date

  console.log(userID, descriptionEntered, durationEntered, dateEntered)

  if (!userID) {
    res.json('Path `userID` is required.')
    return
  }
  if (!descriptionEntered) {
    res.json('Path `description` is required.')
    return
  }
  if (!durationEntered) {
    res.json('Path `duration` is required.')
    return
  }

  // Check if user ID is in the User model
  User.findOne({ _id: userID }, (error, data) => {
    if (error) {
      res.json('Invalid userID')
      return console.log(error)
    }
    if (!data) {
      res.json('Unknown userID')
      return
    } else {
      const usernameMatch = data.username

      // Create an Exercise object
      const newExercise = new Exercise({
        username: usernameMatch,
        description: descriptionEntered,
        duration: durationEntered,
      })

      // Set the date of the Exercise object if the date was entered
      if (dateEntered) {
        newExercise.date = dateEntered
      }

      // Save the exercise
      newExercise.save((error, data) => {
        if (error) return console.log(error)

        // Create JSON object to be sent to the response
        const exerciseObject = {
          _id: userID,
          username: data.username,
          date: data.date.toDateString(),
          duration: data.duration,
          description: data.description,
        }

        // Send JSON object to the response
        res.json(exerciseObject)
      })
    }
  })
})

// PATH /api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id
  const { from, to, limit } = req.query

  // Validate the user ID
  User.findById(userId, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Internal Server Error' })
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Construct the filter for exercise logs
    const logFilter = { username: user.username }
    if (from || to) {
      logFilter.date = {}
      if (from) logFilter.date.$gte = new Date(from)
      if (to) logFilter.date.$lt = new Date(to)
    }

    // Find exercise logs
    Exercise.find(logFilter)
      .limit(limit ? parseInt(limit, 10) : undefined)
      .exec((err, exercises) => {
        if (err) {
          return res.status(500).json({ error: 'Internal Server Error' })
        }

        // Construct the response object
        const logArray = exercises.map((exercise) => ({
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date.toDateString(),
        }))

        const responseObject = {
          _id: userId,
          username: user.username,
          count: logArray.length,
          log: logArray,
        }

        res.json(responseObject)
      })
  })
})

app.get('/api/exercises', (req, res) => {
  Exercise.find({}, (error, data) => {
    if (error) return console.log(error)
    res.json(data)
  })
})

// Listen on the proper port to connect to the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
