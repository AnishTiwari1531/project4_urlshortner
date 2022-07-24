const express = require('express')
const router = express.Router()
const urlController = require('../controller/urlController')

//-----------------------------------------------------------------------------------//

router.post('/url/shorten', urlController.createShortenURL)

router.get('/:urlCode', urlController.getUrlByUrlCode)

router.all("/**", function (req, res) {
    res.status(404).send({ status: false, message: "The api you request is not available" })
})

//-----------------------------------------------------------------------------------//

module.exports = router

//-----------------------------------------------------------------------------------//
