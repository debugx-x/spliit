import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
} from '@/lib/notification-feed'
import { authedProcedure, createTRPCRouter } from '@/trpc/init'

// The in-app bell: only ever the logged-in user's own notifications
export const notificationsRouter = createTRPCRouter({
  list: authedProcedure.query(({ ctx }) =>
    listNotifications(ctx.session.userId),
  ),
  unreadCount: authedProcedure.query(({ ctx }) =>
    countUnreadNotifications(ctx.session.userId),
  ),
  markAllRead: authedProcedure.mutation(({ ctx }) =>
    markAllNotificationsRead(ctx.session.userId),
  ),
})
