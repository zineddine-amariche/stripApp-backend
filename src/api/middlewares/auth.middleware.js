const jwt = require('jsonwebtoken');


const auth = async (req, res, next) => {
    try {


         const token = req.header('x-access-token')
        //const token = req.header("Authorization")
        if (!token) return res.status(400).json({ msg: "Invalid token Authentication." })

        console.log('token',token)
      
        jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
            if (err) return res.status(400).json({ msg: "  non valide user ." })

            req.user = user
            next()
        })
    } catch (error) {
        console.log(error);
    }

}



module.exports.auth = auth;