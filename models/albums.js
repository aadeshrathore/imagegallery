var Sequelize = require('sequelize');

// create a sequelize instance with our local postgres database information.
var sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/authsystem');

// setup User model and its fields.
var Album = sequelize.define('albums', {
    username: {
        type: Sequelize.STRING,
        references: { model: "users", key: "username" }, 
    },
    albumname: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    description: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

// create all the defined tables in the specified database.
sequelize.sync()
    .then(() => console.log('album table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = Album;