export function registerFirmHandlers(socket, context){
  const {firmWarManager, guard} = context;

  function emitSnapshot(){
    socket.emit("firm:ranking", firmWarManager.snapshot());
  }

  socket.on("firm:sync", ()=>{
    if(!guard("firm:sync")) return;
    emitSnapshot();
  });

  emitSnapshot();
}
