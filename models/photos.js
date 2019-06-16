var Sequelize = require('sequelize');

// create a sequelize instance with our local postgres database information.
var sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/authsystem');

// setup User model and its fields.
var Photo = sequelize.define('photos', {
    albumId: {
        type: Sequelize.INTEGER,
        references: { model: "albums", key: "id" }
    },
    photoId: {
        type: Sequelize.STRING(1234),
        allowNull: false,
        unique: true
    }
});

// create all the defined tables in the specified database.
sequelize.sync({alter:true})
    .then(() => console.log('photo table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = Photo;