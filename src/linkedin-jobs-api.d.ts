declare module "linkedin-jobs-api" {
  function query(options: Record<string, unknown>): Promise<Record<string, string>[]>;
  export default { query };
}
