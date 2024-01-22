const  User  = require('../models/user.model')

const admin = async (req, res, next) => {
    try {
        const user = await User.findOne(req.user.role)
        console.log(user)
        if(user.role !== 1) 
            return res.status(500).json({msg: "Accès aux ressources d'administration refusé."})

        next()
    } catch (err) {
        return res.status(500).json({msg: err.message})
    }


}

module.exports = admin
