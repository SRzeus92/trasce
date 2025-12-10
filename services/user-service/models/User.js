import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    avatar_url: {
      type: DataTypes.STRING,
      defaultValue: "avatars/default.jpg"
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    won_matches: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lost_matches: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false,
    tableName: 'users'
  })

  return User
}
