import PixelCanvas from './pxcanvas.js';
import { Particle, particleTypes } from './particles.js'

class Cell {
	constructor(options) {
		this._options = options;

		this.field = options.field;

		this.particle = new particleTypes.air();
		this.setParticle(this.particle);

		if(!options.particle) {
			this.setParticle(new particleTypes.air());
		} else {
			this.setParticle(options.particle);
		}
		this.positionX = options.X;
		this.positionY = options.Y;
		this.nextState = null;
	}
	applyChanges() {
		if(this.nextState) {
			if(this.nextState == 'clear') {
				this.clearParticle();
			} else {
				this.setParticle(this.nextState);
			}
			this.nextState = null;
		}
	}
	setParticle(particle, unlink) {
		if(!(particle instanceof Particle)) throw new Error('invalid particle');
		if(!unlink) this.clearParticle();
		this.particle = particle;
		this.particle.cell = this;
	}
	setParticleType(type) {
		return this.setParticle(new (particleTypes[type.toLowerCase()])());
	}
	getParticle() {
		return this.particle;
	}
	clearParticle() {
		this.particle.cell = null;
		this.setParticle(new particleTypes.air(), 1);
	}
	get isAir() {
		return (!this.particle) || (this.particle instanceof particleTypes.air); 
	}
}

class Field {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.init();
	}
	init() {
		this.field = new Array(this.height).fill(null);
		this.field.forEach((v, y) => {
			this.field[y] = new Array(this.width).fill(null).map((_, x) => new Cell({X: x, Y: y, field: this}));
		});
		console.log('initField success');
	}
	get(x, y) {
		if(!this.field[y]) return null;
		return this.field[y][x]
	}
	set(x, y, v) {
		this.field[y][x] = v;
	}
	getParticleAt(x,y) {
		return this.field[y][x].getParticle();
	}
	setParticleAt(x,y,v) {
		if(typeof(v) === 'string') v = new particleTypes[v]();
		this.field[y][x].setParticle(v);
	}

	queryCircle(ox, oy, r) {
		const query = [];
		for(let x = -r; x < r; x++) {
			const h = Math.sqrt(r**2 - x**2);
			for(let y = -h; y < h; y++) {
				const item = this.get(Math.round(x + ox), Math.round(y + oy));
				if(item) query.push(item)
			}
		}
		return query;
	}

	applyChanges() {
		for(let y = 0; y < this.height; y++) {
			for(let x = 0; x < this.width; x++) {
				this.get(x, y).applyChanges();
			}
		}
	}
}

export default class JSand {
	static createOnLoad(...params) {
		return new Promise((resolve,reject) => {
			const onLoad = () => {
				const jsand = new JSand(...params);
				resolve(jsand);
			};
			if(document.readyState === "interactive" || document.readyState === "complete") {
	    		onLoad();
	    	} else {
	    		document.addEventListener('DOMContentLoaded', onLoad);
	    	}
		});
	}
	constructor(target = document.body, width = 600, height = 400) {
		if(document.readyState === 'loading') throw new Error('DOM not yet loaded');
		if(typeof target === 'string') target = document.querySelector(target);
		this.base = target;
		this.width = width;
		this.height = height;

		this.field = new Field(this.width, this.height);

		const canvasElement = document.createElement('canvas');
		this.base.appendChild(canvasElement);
		this.canvasElement = canvasElement;
		this.canvas = new PixelCanvas(canvasElement, this.width, this.height, true);
		this.canvas.clear(0,0,0);
    	this.canvas.blit();

		this.canvasElement.addEventListener('mousedown',  e => this.onDown(e.offsetX, e.offsetY));
		this.canvasElement.addEventListener('mousemove',  e => this.onMove(e.offsetX, e.offsetY));
		document.addEventListener('mouseup',  e => this.onUp(e.offsetX, e.offsetY));

		const loop = () => {
			this.update();
			this.draw();
			requestAnimationFrame(loop);
		}
		requestAnimationFrame(loop);

		this.selected = 'sand';

		this.particleListElement = document.createElement('div');
		this.base.appendChild(this.particleListElement);
		console.log(particleTypes)
		for (const [i, v] of Object.entries(particleTypes)) {
			const item = document.createElement('div');
			item.classList.add('particle-type');
			item.textContent = v.name;
			const cssColor = v.uColor.map(v => (parseInt(v.toString().replace(/\D/g,'')) & 0xFF)).join(',');
			const cssTextColor = (v.uColor[0] * 0.299 + v.uColor[1] * 0.587 + v.uColor[2] * 0.114) > 186 ? '#000000' : '#ffffff';
			Object.assign(item.style, {
				backgroundColor: 'rgb(' + cssColor + ')',
				color: cssTextColor,
			});
			if(i === this.selected) {
				item.classList.add('selected-particle-type');
			}
			item.addEventListener('click', () => {
				this.particleListElement.getElementsByClassName('selected-particle-type')[0].classList.remove('selected-particle-type')
				item.classList.add('selected-particle-type');
				this.selected = i;
			});
			this.particleListElement.appendChild(item);
		};
	}

	update() {
		this.field.applyChanges();
		for(let y = 0; y < this.height; y++) {
			for(let x = 0; x < this.width; x++) {
				const v = this.field.get(x,y);
				const p = v.getParticle();
				p.update();
			}
		}
	}

	draw() {
		this.canvas.frameStart();
		for(let y = 0; y < this.height; y++) {
			for(let x = 0; x < this.width; x++) {
				const v = this.field.get(x,y);
				const p = v.getParticle();
				let color;
				if(p.draw) {
					color = p.draw();
				} else {
					color = p.constructor.fColor;
				}
				this.canvas.linePut(...color)
			}
		}
		this.canvas.blit();
	}

	onDown(x, y) {
		this._down = true;
	}
	onMove(x, y) {
		if(this._down) {
			this.field.queryCircle(x, y, 10).forEach(v => {
				if(this.selected !== 'air') {
					if(!v.isAir) return;
				}
				v.setParticleType(this.selected);
				v.nextState = v.getParticle();
			});
		}
	}
	onUp(x, y) {
		this._down = false;
	}
}