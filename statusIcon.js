const {St, Gio} = imports.gi;
const Me = imports.misc.extensionUtils.getCurrentExtension();

const CONNECTED_ICON    = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_connected.svg');
const DISCONNECTED_ICON = Gio.icon_new_for_string(Me.dir.get_path() + '/icons/vpn_disconnected.svg');

class StatusIcon extends St.Icon{
    constructor(status){
        super._init({
            gicon: this.connected?CONNECTED_ICON:DISCONNECTED_ICON,
            style_class: 'system-status-icon',
        });
        this.status = status;
    }

    set_status(newStatus){
        if(newStatus != this.status){
            this.status = newStatus;
            this._set_icon(this.status);
        }
    }

    toggle_icon(){
        this.set_status(!this.status);
    }

    _set_icon(to_state){
        super.set_gicon(to_state?CONNECTED_ICON:DISCONNECTED_ICON);
    }
}

var exports = {
    StatusIcon: StatusIcon
}