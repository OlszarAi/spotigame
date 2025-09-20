import { prisma } from './prisma'

/**
 * Find a lobby by ID or game code
 * @param idOrCode - Full lobby ID or 8-character game code
 * @param includeOptions - Prisma include options
 * @returns Lobby or null if not found
 */
export async function findLobbyByIdOrCode(
  idOrCode: string,
  includeOptions?: object
) {
  // If the id is 8 characters or less, treat it as a game code
  if (idOrCode.length <= 8) {
    // Search for lobby by game code
    return await prisma.lobby.findUnique({
      where: {
        code: idOrCode.toUpperCase()
      },
      include: includeOptions
    })
  } else {
    // Use full ID lookup
    return await prisma.lobby.findUnique({
      where: { id: idOrCode },
      include: includeOptions
    })
  }
}
