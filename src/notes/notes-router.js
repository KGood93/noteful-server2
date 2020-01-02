const path = require("path")
const express = require("express")
const xss = require("xss")
const jsonParser = express.json()
const noteService = require("./notes-service")
const notesRouter = express.Router()

const serializeNote = note => ({
    id: note.id,
    name: xss(note.note_name),
    folderid: note.folder_id,
    content: xss(note.content)
});

notesRouter
    .route("/")
    .get((req, res, next) => {
        const knexInstance = req.app.get("db");
        noteService.getAllNotes(knexInstance)
            .then(notes => {
                res.json(notes.map(serializeNote))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const {note_name, folder_id, content} = req.body
        const newNote = { note_name, folder_id, content}

        for(const [key, value] of Object.entries(newNote))
            if (value == null)
                return res.status(400).json({
                    error: {message: `Missing '${key}' in request body`}
                })

        noteService.insertNote(req.app.get("db"), newNote)
            .then(note => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${note.id}`))
                    .json(serializeNote(note))
            })
            .catch(next)
    })

notesRouter
    .route("/:note_id")
    .all((req, res, next) => {
       noteService.getById(req.app.get("db"), req.params.note_id)
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: {message: `note doesn't exist`}
                    })
                }
                res.note = note
                    next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeNote(res.note))
    })
    .delete((req, res, next) => {
        noteService.deleteNote(req.app.get("db"), req.params.note_id)
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const {content} = req.body
        const noteToUpdate = {content}

        const numberofValues = Object.values(noteToUpdate).filter(Boolean).length
            
        if(numberofValues === 0)
            return res.status(400).json({
                error: {message: `Request body is missing required fields`}
            })

        noteService.updateNote(
            req.app.get("db"),
            req.params.note_id,
            noteToUpdate
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = notesRouter

