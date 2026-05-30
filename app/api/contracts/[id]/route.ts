import { NextRequest, NextResponse } from 'next/server'
import { fetchContractById, MOCK_CONTRACTS } from '@/lib/sam-api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contract = await fetchContractById(id)
    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }
    return NextResponse.json({ contract })
  } catch (err) {
    console.error('Contract by ID error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
