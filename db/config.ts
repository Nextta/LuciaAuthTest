import { defineDb, defineTable, column } from 'astro:db';

const User = defineTable({
  columns:{
    id: column.number({primaryKey: true}),
    username: column.text({unique: true, optional: false}),
    password: column.text({optional: true})
  }
})

const Session = defineTable({
  columns:{
    id: column.number({primaryKey: true}),
    userId: column.number({references: () => User.columns.id}),
    expiresAt: column.number()
  }
})


// https://astro.build/db/config
export default defineDb({
  tables: {
    User,
    Session
  }
});
