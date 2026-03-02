import { BatchCommand, Command } from "./Cmds";
class History {
    
    limit:number = 50;
    undos:Command[] = [];
    redos:Command[] = [];
    saveCommand:Command = null;
    batchDepth:number = 0;
    batchCommands:Command[] = [];
    batchName:string = 'batch';

    constructor(limit?:number) {
        this.limit = limit || 50;     
    }

    startBatch(name?:string) {
        if (this.batchDepth === 0) {
            this.clearRedo();
            this.batchCommands = [];
            this.batchName = name || 'batch';
        }
        this.batchDepth++;
    }

    endBatch() {
        if (this.batchDepth === 0) return;
        this.batchDepth--;
        if (this.batchDepth > 0) return;
        if (!this.batchCommands.length) return;
        this.pushUndo(new BatchCommand(this.batchCommands, this.batchName, true));
        this.batchCommands = [];
    }

    pushUndo(command:Command) {
        var length = this.undos.length;
        if (length >= this.limit) {
            this.undos.shift();
        }
        this.undos.push(command);
        this.change(command);
    }

    execute(command:Command) {
        if (this.batchDepth > 0) {
            if (command.execute()) {
                this.batchCommands.push(command);
            }
            return;
        }
        this.clearRedo();
        if (command.execute()){
            this.pushUndo(command);
        }
    }

    undo() {
        if(this.canUndo()) {
            var command = this.undos.pop();
            this.redos.push(command);
            command.undo();
            this.change(command);
        }
    }

    canUndo() {
        return !!this.undos.length
    }

    redo() {
        if (this.canRedo()) {
            var command = this.redos.pop()
            this.undos.push(command);
            command.redo();
            this.change(command)
        }
    }

    canRedo() {
        return !!this.redos.length
    }

    save() {
        this.saveCommand = this.undos[this.undos.length - 1];
    }

    dirty() {
        return this.saveCommand != this.undos[this.undos.length - 1];
    }

    clearRedo() {
        this.redos = [];
    }

    clear() {
        this.undos = [];
        this.redos = [];
        this.saveCommand = null;
        this.change();
    }

    change(cmd?:any) {

    }
}
export default History;
