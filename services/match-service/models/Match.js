import { DataTypes } from 'sequelize'

export default (sequelize) => {
  const Match = sequelize.define('Match', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true
    },
    opponent_alias: {
      type: DataTypes.STRING,
      defaultValue: null
    },
    user_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    opponent_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    played_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false,
    tableName: 'matches'
  })

  return Match
}
