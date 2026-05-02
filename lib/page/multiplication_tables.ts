import { update_symmetric_group_table, init as init_symmetric } from './permute_multiplication_table.js';
import { update_dihedral_group_table, init as init_dihedral } from './dihedral_multiplication_table.js';
import { update_gl_group_table, init as init_gl } from './gl_multiplication_table.js';
import { update_modular_table, init as init_modular } from './modular_multiplication_table.js';

let shared_sz = 6;
let gl_n = 2;
let gl_m = 2;

let current_table = 'modular';

function clamp_shared_for_table(name: string) {
    const max = shared_max_for_table(name);
    const min = shared_min_for_table(name);
    if (shared_sz > max) {
        shared_sz = max;
    }
    if (shared_sz < min) {
        shared_sz = min;
    }
}

function shared_max_for_table(name: string): number {
    if (name === 'symmetric') {
        return 5;
    }
    if (name === 'dihedral') {
        return 10;
    }
    if (name === 'modular') {
        return 100;
    }
    return shared_sz;
}

function shared_min_for_table(name: string): number {
    if (name === 'symmetric') {
        return 2;
    }
    if (name === 'dihedral') {
        return 3;
    }
    if (name === 'modular') {
        return 2;
    }
    return shared_sz;
}

export function show_table(name: string) {
    current_table = name;
    if (name !== 'gl') {
        clamp_shared_for_table(name);
    }
    document.getElementById('modular_container').style.display = 'none';
    document.getElementById('symmetric_container').style.display = 'none';
    document.getElementById('dihedral_container').style.display = 'none';
    document.getElementById('gl_container').style.display = 'none';

    document.getElementById(name + '_container').style.display = 'block';
    update_tables();
}

function update_tables() {
    if (current_table === 'symmetric') {
        update_symmetric_group_table(shared_sz);
    } else if (current_table === 'dihedral') {
        update_dihedral_group_table(shared_sz);
    } else if (current_table === 'gl') {
        // GL has two parameters, we don't share size with it.
        update_gl_group_table(gl_n, gl_m);
    } else if (current_table === 'modular') {
        update_modular_table(shared_sz);
    }
}

export function increment_symmetric() {
    if (shared_sz < 5) {
        shared_sz++;
        update_symmetric_group_table(shared_sz);
    }
}

export function decrement_symmetric() {
    if (shared_sz > 2) {
        shared_sz--;
        update_symmetric_group_table(shared_sz);
    }
}

export function increment_dihedral() {
    if (shared_sz < 10) {
        shared_sz++;
        update_dihedral_group_table(shared_sz);
    }
}

export function decrement_dihedral() {
    if (shared_sz > 3) {
        shared_sz--;
        update_dihedral_group_table(shared_sz);
    }
}

export function increment_gl() {
    if (gl_m < 3) {
        gl_m++;
        update_gl_group_table(gl_n, gl_m);
    }
}

export function decrement_gl() {
    if (gl_m > 2) {
        gl_m--;
        update_gl_group_table(gl_n, gl_m);
    }
}

export function increment_modular() {
    if (shared_sz < 100) {
        shared_sz++;
        update_modular_table(shared_sz);
    }
}

export function decrement_modular() {
    if (shared_sz > 2) {
        shared_sz--;
        update_modular_table(shared_sz);
    }
}

// Initial load
init_symmetric();
init_dihedral();
init_gl();
init_modular();
show_table('modular');

