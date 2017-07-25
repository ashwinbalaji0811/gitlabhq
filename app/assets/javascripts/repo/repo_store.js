import RepoHelper from './repo_helper';

const RepoStore = {
  ideEl: {},
  monacoInstance: {},
  service: '',
  editor: '',
  sidebar: '',
  editButton: '',
  editMode: false,
  isTree: false,
  prevURL: '',
  projectId: '',
  projectName: '',
  trees: [],
  blobs: [],
  submodules: [],
  blobRaw: '',
  blobRendered: '',
  openedFiles: [],
  tabSize: 100,
  defaultTabSize: 100,
  minTabSize: 30,
  tabsOverflow: 41,
  tempPrivateToken: '',
  activeFile: {
    active: true,
    binary: false,
    extension: '',
    html: '',
    mime_type: '',
    name: 'loading...',
    plain: '',
    size: 0,
    url: '',
    raw: false,
    newContent: '',
    changed: false,
    loading: false
  },
  activeFileIndex: 0,
  activeLine: 0,
  activeFileLabel: 'Raw',
  files: [],
  isCommitable: false,
  binary: false,
  currentBranch: '',
  commitMessage: 'Update README.md',
  binaryMimeType: '',
  // scroll bar space for windows
  scrollWidth: 0,
  binaryTypes: {
    png: false,
    markdown: false,
  },
  loading: {
    tree: false,
    blob: false,
  },

  // mutations

  checkIsCommitable() {
    RepoStore.service.checkCurrentBranchIsCommitable()
      .then((data) => {
        // you shouldn't be able to make commits on commits or tags. 
        let {Branches, Commits, Tags} = data.data;
        if(Branches && Branches.length) RepoStore.isCommitable = true;
        if(Commits && Commits.length) RepoStore.isCommitable = false;
        if(Tags && Tags.length) RepoStore.isCommitable = false;
      });
  },

  addFilesToDirectory(inDirectory, currentList, newList) {
    RepoStore.files = RepoHelper.getNewMergedList(inDirectory, currentList, newList);
  },

  toggleRawPreview() {
    RepoStore.activeFile.raw = !RepoStore.activeFile.raw;
    RepoStore.activeFileLabel = RepoStore.activeFile.raw ? 'Display rendered file' : 'Display source';
  },

  setActiveFiles(file) {
    if (RepoStore.isActiveFile(file)) return;

    RepoStore.openedFiles = RepoStore.openedFiles
      .map((openedFile, i) => RepoStore.setFileActivity(file, openedFile, i));

    RepoStore.setActiveToRaw();

    if (file.binary) {
      RepoStore.blobRaw = file.base64;
    } else {
      RepoStore.blobRaw = file.plain;
    }

    if (!file.loading) RepoHelper.toURL(file.url);
    RepoStore.binary = file.binary;
  },

  setFileActivity(file, openedFile, i) {
    const activeFile = openedFile;
    activeFile.active = file.url === activeFile.url;

    if (activeFile.active) RepoStore.setActiveFile(activeFile, i);

    return activeFile;
  },

  setActiveFile(activeFile, i) {
    RepoStore.activeFile = activeFile;
    RepoStore.activeFileIndex = i;
  },

  setActiveToRaw() {
    RepoStore.activeFile.raw = false;
    // can't get vue to listen to raw for some reason so RepoStore for now.
    RepoStore.activeFileLabel = 'Display source';
  },

  removeChildFilesOfTree(tree) {
    let foundTree = false;
    const treeToClose = tree;
    let wereDone = false;
    RepoStore.files = RepoStore.files.filter((file) => {
      const isItTheTreeWeWant = file.url === treeToClose.url;
      // if it's the next tree
      if(foundTree && file.type === 'tree' && !isItTheTreeWeWant && file.level === treeToClose.level) {
        wereDone = true;
        return true;
      }
      if(wereDone) return true;

      if (isItTheTreeWeWant) foundTree = true;

      if (foundTree) return file.level <= treeToClose.level;
      return true;
    });

    treeToClose.opened = false;
    treeToClose.icon = 'fa-folder';
    return treeToClose;
  },

  removeFromOpenedFiles(file) {
    if (file.type === 'tree') return;

    RepoStore.openedFiles = RepoStore.openedFiles.filter(openedFile => openedFile.url !== file.url);
  },

  addPlaceholderFile() {
    const randomURL = RepoHelper.Time.now();
    const newFakeFile = {
      active: false,
      binary: true,
      type: 'blob',
      loading: true,
      mime_type: 'loading',
      name: 'loading',
      url: randomURL,
      fake: true,
    };

    RepoStore.openedFiles.push(newFakeFile);

    return newFakeFile;
  },

  addToOpenedFiles(file) {
    const openFile = file;

    const openedFilesAlreadyExists = RepoStore.openedFiles
      .some(openedFile => openedFile.url === openFile.url);

    if (openedFilesAlreadyExists) return;

    openFile.changed = false;
    RepoStore.openedFiles.push(openFile);
  },

  setActiveFileContents(contents) {
    if (!RepoStore.editMode) return;

    RepoStore.activeFile.newContent = contents;
    RepoStore.activeFile.changed = RepoStore.activeFile.plain !== RepoStore.activeFile.newContent;
    RepoStore.openedFiles[RepoStore.activeFileIndex].changed = RepoStore.activeFile.changed;
  },

  // getters

  isActiveFile(file) {
    return file && file.url === RepoStore.activeFile.url;
  },
};
export default RepoStore;
