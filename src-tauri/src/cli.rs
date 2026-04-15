use std::fs;
use std::path::Path;

use anyhow::{Context, Result};
use clap::Parser;
use rusqlite::Connection;

use crate::database;
use crate::features::blocks::service;

#[derive(Parser)]
#[command(name = "flux")]
#[command(about = "FluxNote CLI - Quick note taking from the command line", long_about = None)]
#[command(version)]
struct Cli {
    /// Content to add (text or file path)
    content: String,
}

fn get_database_path() -> Result<std::path::PathBuf> {
    // 优先使用环境变量
    if let Ok(path) = std::env::var("FLUXNOTE_DB_PATH") {
        return Ok(std::path::PathBuf::from(path));
    }

    // 使用默认路径
    let app_data_dir = dirs::data_dir()
        .context("failed to resolve data directory")?
        .join("app.fluxnote");

    fs::create_dir_all(&app_data_dir).context("failed to create app data directory")?;

    Ok(app_data_dir.join("fluxnote.sqlite3"))
}

fn connect_database() -> Result<Connection> {
    let db_path = get_database_path()?;
    database::init_cli_connection(&db_path)
}

fn read_content(input: &str) -> Result<String> {
    let path = Path::new(input);

    // 如果是文件路径且文件存在，读取文件内容
    if path.exists() && path.is_file() {
        fs::read_to_string(path).with_context(|| format!("failed to read file: {}", path.display()))
    } else {
        // 否则作为文本内容直接使用
        Ok(input.to_string())
    }
}

pub fn run() {
    if let Err(e) = run_cli() {
        eprintln!("Error: {:#}", e);
        std::process::exit(1);
    }
}

fn run_cli() -> Result<()> {
    let cli = Cli::parse();

    // 读取内容
    let content = read_content(&cli.content)?;

    // 连接数据库
    let mut conn = connect_database()?;

    // 创建 block
    let block = service::create_block(&mut conn)
        .map_err(|e| anyhow::anyhow!("failed to create block: {:?}", e))?;

    // 更新内容
    let block = service::update_block_content(&mut conn, &block.id, &content)
        .map_err(|e| anyhow::anyhow!("failed to update block content: {:?}", e))?;

    // 构造 deep link URL
    let deep_link_url = format!("fluxnote://block/{}", block.id);

    // 输出结果
    println!("✓ Block created: {}", block.id);

    // 打开 GUI
    open::that(&deep_link_url).context("failed to open deep link URL")?;
    println!("→ Opening FluxNote...");

    Ok(())
}
