if (!crypto.randomUUID) {
  crypto.randomUUID = function () {
    const template: `${string}-${string}-${string}-${string}-${string}` =
      '10000000-1000-4000-8000-100000000000';
    const uuid = template.replace(/[018]/g, (c) =>
      (
        Number(c) ^
        (crypto.getRandomValues(new Uint8Array(1))[0] &
          (15 >> (Number(c) / 4)))
      ).toString(16)
    );
    return uuid as `${string}-${string}-${string}-${string}-${string}`;
  };
}
