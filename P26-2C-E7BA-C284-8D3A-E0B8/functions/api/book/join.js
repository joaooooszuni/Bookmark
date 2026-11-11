/**
 * POST /api/book/join
 * Inscreve o usuário autenticado no livro ativo.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const cookieHeader = request.headers.get("Cookie") || "";

    const sessionMatch =
      cookieHeader.match(/discord_session=([^;]+)/);

    if (!sessionMatch) {
      return Response.json(
        {
          ok: false,
          error: "not_authenticated",
        },
        {
          status: 401,
        }
      );
    }

    let sessionUser;

    try {
      sessionUser = JSON.parse(
        decodeURIComponent(
          atob(sessionMatch[1])
        )
      );
    } catch {
      return Response.json(
        {
          ok: false,
          error: "invalid_session",
        },
        {
          status: 401,
        }
      );
    }

    const userId =
  sessionUser.userId ||
  sessionUser.user_id;

    const activeBook =
      await env.DB.prepare(`
        SELECT id, title
        FROM books
        WHERE active = 1
        LIMIT 1
      `).first();

    if (!activeBook) {
      return Response.json(
        {
          ok: false,
          error: "no_active_book",
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      await env.DB.prepare(`
        SELECT id
        FROM subscriptions
        WHERE user_id = ?
          AND book_id = ?
      `)
        .bind(userId, activeBook.id)
        .first();

    if (existing) {
      return Response.json(
        {
          ok: false,
          error: "already_subscribed",
        },
        {
          status: 409,
        }
      );
    }

    await env.DB.prepare(`
      INSERT INTO subscriptions
      (
        user_id,
        book_id
      )
      VALUES (?, ?)
    `)
      .bind(
        userId,
        activeBook.id
      )
      .run();

    await env.DB.prepare(`
      INSERT INTO reading_progress
      (
        user_id,
        book_id,
        current_chapter
      )
      VALUES (?, ?, ?)
    `)
      .bind(
        userId,
        activeBook.id,
        1
      )
      .run();

    return Response.json({
      ok: true,
      message: "Inscrição realizada com sucesso.",
      book: activeBook.title,
      currentChapter: 1,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        ok: false,
        error: "server_error",
      },
      {
        status: 500,
      }
    );
  }
}