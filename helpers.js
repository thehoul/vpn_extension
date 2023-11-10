const GLib = imports.gi.GLib;

const decoder = new TextDecoder();

function invoke_cmd(cmd){
    var [ok, out, err, _] = GLib.spawn_command_line_sync(cmd);

    // Check if the cmd worked
    if(out.length == 0 && err.length > 0 || !ok){
        // Didn't work so report the error we got and 
        console.log("Error running method ", decoder.decode(err));
        return [false, decoder.decode(err)];
    } else {
        return [true, decoder.decode(out)];
    }
}

var exports = {
    invoke_cmd: invoke_cmd
}