// This file will contain classes for CanvasRectangle and CanvasGroup
// to provide a more object-oriented structure for managing canvas items.

class CanvasRectangle {
    constructor(id, x, y, w, h, zIndex, domElement, parentId = null) {
        this.id = id;
        this.type = 'rectangle';
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.zIndex = zIndex;
        this.domElement = domElement; // Reference to the HTMLElement
        this.parentId = parentId;   // ID of the parent group, if any
    }

    // Potential future methods:
    // toPlainObject() for serialization
    // updatePosition(newX, newY)
    // updateDimensions(newW, newH)
}

// CanvasGroup class will be defined in the next step.

class CanvasGroup {
    constructor(id, parentId = null) {
        this.id = id;
        this.type = 'group';
        this.members = []; // Stores actual CanvasRectangle or CanvasGroup objects
        this.parentId = parentId;
        this.x = 0; // Bounding box x
        this.y = 0; // Bounding box y
        this.w = 0; // Bounding box width
        this.h = 0; // Bounding box height
        this.zIndex = 0; // zIndex for the group itself
        this.domElement = null; // Will hold the group's own DOM element for selection/bounding box vis
    }

    createOrUpdateDomElement(canvas, logicalZoom = 1.0) {
        if (!this.domElement) {
            this.domElement = document.createElement('div');
            this.domElement.id = `group-dom-${this.id}`;
            this.domElement.classList.add('rectangle'); // For base styles like position: absolute
            this.domElement.classList.add('group-boundary'); // For group specific styles
            // Make it non-interactive for mouse events on itself, events should pass through to members if needed
            // or be handled specifically if group itself is the target.
            // For now, let it be like a normal rectangle for selection.
            // this.domElement.style.pointerEvents = 'none'; 
            canvas.appendChild(this.domElement);
        }
        // Update style based on group's calculated bounding box and zIndex
        this.domElement.style.left = (this.x * logicalZoom) + 'px';
        this.domElement.style.top = (this.y * logicalZoom) + 'px';
        this.domElement.style.width = (this.w * logicalZoom) + 'px';
        this.domElement.style.height = (this.h * logicalZoom) + 'px';
        this.domElement.style.zIndex = this.zIndex;
        // Style for group boundary - transparent, but will show selection glow
        this.domElement.style.backgroundColor = 'rgba(0,0,0,0)'; // Transparent
        this.domElement.style.border = '1px dashed #888'; // Optional: visual cue for group bounds even when not selected
                                                       // Or make border transparent and rely on .selected
        // this.domElement.style.borderColor = 'transparent'; // If only glow is desired
    }

    removeDomElement() {
        if (this.domElement && this.domElement.parentElement) {
            this.domElement.parentElement.removeChild(this.domElement);
        }
        this.domElement = null;
    }

    addMember(memberObject) {
        if (memberObject && !this.members.includes(memberObject)) {
            this.members.push(memberObject);
            memberObject.parentId = this.id;
            // Note: Bounding box should be recalculated after adding members.
        }
    }

    removeMember(memberObject) {
        const index = this.members.indexOf(memberObject);
        if (index > -1) {
            this.members.splice(index, 1);
            memberObject.parentId = null;
            // Note: Bounding box should be recalculated after removing members.
        }
    }

    calculateBoundingBox() {
        if (this.members.length === 0) {
            this.x = 0; this.y = 0; this.w = 0; this.h = 0;
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.members.forEach(member => {
            // Each member (Rectangle or Group) is expected to have x, y, w, h properties.
            // If a member is a group, its x,y,w,h should represent its own bounding box.
            minX = Math.min(minX, member.x);
            minY = Math.min(minY, member.y);
            maxX = Math.max(maxX, member.x + member.w);
            maxY = Math.max(maxY, member.y + member.h);
        });

        this.x = minX;
        this.y = minY;
        this.w = maxX - minX;
        this.h = maxY - minY;
    }

    getMemberById(memberId) {
        return this.members.find(member => member.id === memberId);
    }

    // Potential future methods:
    // toPlainObject() for serialization
    // moveBy(dx, dy) - moves group and all members
}
