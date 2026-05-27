import { SuperAdminWinnersPage } from '../winners/SuperAdminWinnersPage'

type RewardHistoryNavItem = {
  label: string
  href: string
  icon: string
  permission: string
}

type SuperAdminRewardHistoryPageProps = {
  authRoute: string
  rootRoute: string
  contestsRoute: string
  navItems: RewardHistoryNavItem[]
}

export function SuperAdminRewardHistoryPage({
  authRoute,
  rootRoute,
  contestsRoute,
  navItems,
}: SuperAdminRewardHistoryPageProps) {
  return (
    <SuperAdminWinnersPage
      authRoute={authRoute}
      contestsRoute={contestsRoute}
      historyMode
      navItems={navItems}
      rootRoute={rootRoute}
    />
  )
}
