import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { id } = await params
    const doc = await prisma.generatedDocument.findFirst({
      where: { id, userId: session.user.id },
      // Explicit select — a future unmigrated column must not fail the read
      select: { content: true },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ content: doc.content })
  } catch (err) {
    console.error('Document GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Save edits from the interactive editor. Only the HTML body content is
// mutable — title/type/notice linkage stay fixed to what was generated.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const content = typeof body.content === 'string' ? body.content : null
    if (content === null) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    // Scope the update to the owner so one user can't edit another's document.
    const existing = await prisma.generatedDocument.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.generatedDocument.update({
      where: { id },
      data: { content },
      select: { id: true },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Document PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const doc = await prisma.generatedDocument.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.generatedDocument.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Document DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
