import { getAllPoliticians } from '@/lib/politicians'
import PoliticiansGrid from '@/components/PoliticiansGrid'

export const revalidate = 60

export default async function HomePage() {
  const politicians = await getAllPoliticians()

  return (
    <main>
      <PoliticiansGrid politicians={politicians} />
    </main>
  )
}
