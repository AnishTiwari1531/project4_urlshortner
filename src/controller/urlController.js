const urlModel = require('../model/urlModel')
const validURL = require('valid-url')
const ShortUniqueId = require('short-unique-id')
const redis = require("redis")
const { promisify } = require("util");

//-----------------------------------------------------------------------------------//

//Connect to redis
const redisClient = redis.createClient(
    13086,
    "redis-13086.c212.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("yTp6IU0JMPd7gaFhO3ls2XjsEWF4hiRX", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});


//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//-----------------------------------------------------------------------------------//

const createShortenURL = async function (req, res) {
    try {
        const longUrl = req.body.longUrl
        if (Object.keys(req.body).length == 0) {
            return res.status(400).send({ status: false, message: "body can not be empty" })
        }

        if (longUrl == "") {
            return res.status(400).send({ status: false, message: "Please provide link, it can not be empty" })
        }
        if (!longUrl) {
            return res.status(400).send({ status: false, message: `Please provide key name as 'longUrl'` })
        }

        if (Object.keys(req.body).length > 1) {
            return res.status(400).send({ status: false, message: "you aren't allowed to provide another key except 'longUrl'" })
        }
        if (validURL.isWebUri(longUrl.toString())) {

                const findUrl = await urlModel.findOne({ $or: [{longUrl : longUrl}, {shortUrl : longUrl}] }).select({ _id: 0, createdAt: 0, updatedAt: 0, __v: 0, })
                if (findUrl) {
                    return res.status(200).send({ status: true, msg: "Data in db", data: findUrl })
                }
                else {
                    const shortURLId = new ShortUniqueId().stamp(10)
                    const shortenUrl = req.protocol + "://" + req.headers.host + "/" + shortURLId
                    const createUrl = await urlModel.create({ longUrl, shortUrl: shortenUrl, urlCode: shortURLId })

                    const data = {
                        urlCode: createUrl.urlCode,
                        longUrl: createUrl.longUrl,
                        shortUrl: createUrl.shortUrl
                    }
                    return res.status(201).send({ status: true, msg : "Short Url Created Successfully", data: data })
                }
        }
        else {
            return res.status(400).send({ status: false, message: "invalid URL" })
        }
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message, errorName: error.name })
    }
}

//-----------------------------------------------------------------------------------//

const getUrlByUrlCode = async function (req, res) {
    try {
        const urlCode = req.params.urlCode

        let cachedUrlData = await GET_ASYNC(`${urlCode}`)
        if (cachedUrlData) {
            return res.status(302).redirect(cachedUrlData)
        }

        const findUrlCode = await urlModel.findOne({ urlCode })

        if (findUrlCode) {
            await SET_ASYNC(`${urlCode}`, findUrlCode.longUrl, "EX", 60 * 2)
            return res.status(302).redirect(findUrlCode.longUrl)
        } else {
            return res.status(404).send({ status: false, message: "no url found" })
        }
    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message, errorName: error.name })
    }
}

//-----------------------------------------------------------------------------------//

module.exports = { createShortenURL, getUrlByUrlCode }

//-----------------------------------------------------------------------------------//