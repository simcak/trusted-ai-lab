/** Offers `text` as a file download. Everything happens in the page; nothing is uploaded. */
export function downloadText(filename: string, text: string, type = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled, otherwise some browsers cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
