var Sequelize = require('sequelize');

// create a sequelize instance with our local postgres database information.

// var sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/authsystem');
if (process.env.DATABASE_URL)
    var sequelize = new Sequelize(process.env.DATABASE_URL);
else
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
        validate: {
            notEmpty: {
                args: true,
                msg: "albumname required"
            },
            len: {
                args: [1, 32],
                msg: "albumname length must be between 1 to 32"
            }
        }
    },
    description: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                args: true,
                msg: "Description required"
            },
            len: {
                args: [1, 32],
                msg: "Describe length must be between 1 to 32"
            }
        }
    }
});

// create all the defined tables in the specified database.
sequelize.sync({ alter: true })
    .then(() => console.log('album table has been successfully created, if one doesn\'t exist'))
    .catch(error => console.log('This error occured', error));

// export User model for use in other files.
module.exports = Album;