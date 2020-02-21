const path = require('path')
const express = require('express')
const xss = require('xss')
const folderService = require('./folders-service')

const foldersRouter = express.Router()
const jsonParser = express.json()

const serializeFolder = folder => ({
    id: folder.id,
    name: xss(folder.folder_name)
})

foldersRouter
    .route('/')
    .get((req, res, next) => {
        folderService.getAllFolders(
            req.app.get('db')
        )
        .then(folders => {
            res.json(folders)
        })
        .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { folder_name } = req.body
        const newFolder = { folder_name }


        for (const [key, value] of Object.entries(newFolder)) {
           if (value == null) {
               return res.status(400).json({
                    error: { message: `Missing '${key}' in request body`}
                })
            }
        }

        folderService.insertFolder(
            req.app.get('db'),
            newFolder
        )
        .then(folder => {
            res
                .status(201)
                .location(path.posix.join(`${req.originalUrl}/${folder.id}`))
                .json(folder)
        })
        .catch(next)
    })


foldersRouter 
    .route('/:folder_id')
    .all((req, res, next) => {
        folderService.getById(req.app.get('db'), req.params.folder_id)
        .then(folder => {
            if (!folder) {
                return res.status(404).json({
                    error: { message: `Folder doesn't exist`}
                })
            }
            res.folder = folder
            next()
        })
        .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeFolder(res.folder))
    })
    .delete((req, res, next) => {
        folderService.deleteFolder(
            req.app.get('db'),
            req.params.folder_id
        )
        .then(() => {
            res.status(204).end()
        })
        .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { name } = req.body
        const folderToUpdate = { name }

        const numberOfValues = Object.values(folderToUpdate).filter(boolean).length
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request must contain a name`
                }
            })
        }

        folderService.updateFolder(
            req.app.get('db'),
            req.params.folder_id,
            folderToUpdate
        )
        .then(numRowsAffected => {
            res.status(204).end()
        })
        .catch(next)
    })

module.exports = foldersRouter