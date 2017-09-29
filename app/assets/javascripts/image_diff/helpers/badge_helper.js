export function createImageBadge(noteId, classNames = []) {
  const buttonEl = document.createElement('button');
  const classList = classNames.concat(['btn-transparent', 'js-image-badge']);
  buttonEl.classList.add(...classList);
  buttonEl.setAttribute('type', 'button');
  buttonEl.dataset.noteId = noteId;

  return buttonEl;
}

export function centerButtonToCoordinate(buttonEl, coordinate) {
  // TODO: We should use math to calculate the width so that we don't
  // have to do a reflow after adding to the DOM
  // but we can leave this here for now

  // Set button center to be the center of the clicked position
  const { x, y } = coordinate;
  const { width, height } = buttonEl.getBoundingClientRect();
  buttonEl.style.left = `${x - (width * 0.5)}px`; // eslint-disable-line no-param-reassign
  buttonEl.style.top = `${y - (height * 0.5)}px`; // eslint-disable-line no-param-reassign
}

export function addImageBadge(containerEl, { coordinate, badgeText, noteId }) {
  const buttonEl = createImageBadge(noteId, ['badge']);
  buttonEl.innerText = badgeText;

  containerEl.appendChild(buttonEl);
  centerButtonToCoordinate(buttonEl, coordinate);
}

export function addImageCommentBadge(containerEl, { coordinate, noteId }) {
  const buttonEl = createImageBadge(noteId, ['image-comment-badge', 'inverted']);
  const iconEl = document.createElement('i');
  iconEl.classList.add('fa', 'fa-comment-o');
  iconEl.setAttribute('aria-label', 'comment');

  buttonEl.appendChild(iconEl);
  containerEl.appendChild(buttonEl);
  centerButtonToCoordinate(buttonEl, coordinate);
}

export function imageBadgeOnClick(event) {
  event.stopPropagation();
  const badge = event.currentTarget;
  window.location.hash = badge.dataset.noteId;
}

export function addAvatarBadge(el, event) {
  const { noteId, badgeNumber } = event.detail;

  // Add badge to new comment
  const avatarBadgeEl = el.querySelector(`#${noteId} .badge`);
  avatarBadgeEl.innerText = badgeNumber;
  avatarBadgeEl.classList.remove('hidden');
}
