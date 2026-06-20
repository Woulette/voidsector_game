export function isAuthenticatedGameplaySession(multiplayer){
  return Boolean(
    multiplayer?.connected
    && multiplayer?.socket
    && multiplayer?.auth?.account?.id
    && multiplayer?.auth?.profileReady
  );
}
